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
import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;

public class OutlineListFragment extends Fragment {
    private RecyclerView mOutlineRecyclerView;
    private OutlineEntryAdapter mAdapter;
    private List<OutlineEntry> mOutlineList;

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


    private static class OutlineEntryHolder extends RecyclerView.ViewHolder {
        private TextView mTitleTextView;
        private TextView mPageTextView;
        private ImageView mHasChildrenImageView;

        public OutlineEntryHolder(LayoutInflater inflater, ViewGroup parent) {
            super(inflater.inflate(R.layout.row_item_outline, parent, false));
            mTitleTextView = itemView.findViewById(R.id.outlineEntryTitle);
            mPageTextView = itemView.findViewById(R.id.outlinePageTextView);
            mHasChildrenImageView = itemView.findViewById(R.id.outlineHasChildrenImageView);
        }

        public void bind(OutlineEntry outlineEntry) {
            mTitleTextView.setText(outlineEntry.getTitle());
            mPageTextView.setText(String.valueOf(outlineEntry.getPageNumber()));
            mHasChildrenImageView.setVisibility(outlineEntry.getChildren().isEmpty()
                    ? View.INVISIBLE : View.VISIBLE);
        }
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

        public void updateOutlineList(List<OutlineEntry> outlineList) {
            mOutlineList = outlineList;
        }

        @Override
        public int getItemCount() {
            return mOutlineList == null ? 0 : mOutlineList.size();
        }
    }
}
