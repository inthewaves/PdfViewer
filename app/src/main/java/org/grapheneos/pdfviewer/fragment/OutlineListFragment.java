package org.grapheneos.pdfviewer.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import org.grapheneos.pdfviewer.R;
import org.grapheneos.pdfviewer.activity.OutlineActivity;
import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;

public class OutlineListFragment extends Fragment {
    private RecyclerView mOutlineRecyclerView;
    private OutlineEntryAdapter mAdapter;
    private List<OutlineEntry> mOutlineList;

    private OnOutlineEntrySelectedListener mCallback;

    public static OutlineListFragment newInstance(List<OutlineEntry> outlineList) {
        final OutlineListFragment fragment = new OutlineListFragment();
        fragment.mOutlineList = outlineList;
        return fragment;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_outline_list, container, false);

        mOutlineRecyclerView = view.findViewById(R.id.outline_recycler_view);
        mOutlineRecyclerView.setLayoutManager(new LinearLayoutManager(getActivity()));

        mAdapter = new OutlineEntryAdapter(mOutlineList);
        mOutlineRecyclerView.setAdapter(mAdapter);

        return view;
    }

    private class OutlineEntryHolder extends RecyclerView.ViewHolder
            implements View.OnClickListener {
        private TextView mTitleTextView;
        private TextView mPageTextView;
        private ImageView mHasChildrenImageView;

        private OutlineEntry mOutlineEntry;

        public OutlineEntryHolder(LayoutInflater inflater, ViewGroup parent) {
            super(inflater.inflate(R.layout.row_item_outline, parent, false));
            itemView.setOnClickListener(this);
            itemView.setClickable(true);
            mTitleTextView = itemView.findViewById(R.id.outlineEntryTitle);
            mPageTextView = itemView.findViewById(R.id.outlinePageTextView);
            mPageTextView.setVisibility(View.INVISIBLE);
            mHasChildrenImageView = itemView.findViewById(R.id.outlineHasChildrenImageView);
        }

        public void bind(OutlineEntry outlineEntry) {
            mOutlineEntry = outlineEntry;
            mTitleTextView.setText(outlineEntry.getTitle());
            final String pageNumber = String.valueOf(outlineEntry.getPageNumber());
            if ("-1".equals(pageNumber)) {
                mPageTextView.setVisibility(View.INVISIBLE);
            } else {
                mPageTextView.setVisibility(View.INVISIBLE);
                mPageTextView.setText(pageNumber);
            }

            mHasChildrenImageView.setVisibility(outlineEntry.getChildren().isEmpty()
                    ? View.INVISIBLE : View.VISIBLE);
        }

        @Override
        public void onClick(View v) {
            if (!mOutlineEntry.getChildren().isEmpty()) {
                OutlineActivity outlineActivity = (OutlineActivity) requireActivity();
                outlineActivity.addFragmentAndPushToStack(mOutlineEntry.getChildren());
            } else {
                mCallback.onOutlineEntrySelected(mOutlineEntry.getPageNumber());
            }
        }
    }

    public void setOnOutlineEntrySelectedListener(OnOutlineEntrySelectedListener callback) {
        mCallback = callback;
    }

    public interface OnOutlineEntrySelectedListener {
        public void onOutlineEntrySelected(int pageNumber);
    }

    private class OutlineEntryAdapter extends RecyclerView.Adapter<OutlineEntryHolder> {
        private List<OutlineEntry> mOutlineList;

        public OutlineEntryAdapter(List<OutlineEntry> outlineList) {
            mOutlineList = outlineList;
        }

        @NonNull
        @Override
        public OutlineEntryHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            LayoutInflater layoutInflater = LayoutInflater.from(getActivity());
            return new OutlineEntryHolder(layoutInflater, parent);
        }

        @Override
        public void onBindViewHolder(@NonNull OutlineEntryHolder holder, int position) {
            OutlineEntry outlineEntry = mOutlineList.get(position);
            holder.bind(outlineEntry);
        }

        private void setCurrentList(List<OutlineEntry> list) {
            mOutlineList = list;
        }

        @Override
        public int getItemCount() {
            return mOutlineList == null ? 0 : mOutlineList.size();
        }
    }
}
